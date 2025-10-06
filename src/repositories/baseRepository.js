import sql from '../config/database.js';

/**
 * Repository de base pour les opérations CRUD communes
 * Fournit les méthodes de base pour tous les repositories
 */
export class BaseRepository {
  constructor(tableName) {
    this.tableName = tableName;
  }

  /**
   * Récupérer tous les enregistrements
   * @param {Object} options - Options de requête (orderBy, limit, offset)
   * @returns {Promise<Array>} Liste des enregistrements
   */
  async findAll(options = {}) {
    try {
      let query = sql`SELECT * FROM ${sql(this.tableName)}`;
      
      if (options.orderBy) {
        query = sql`${query} ORDER BY ${sql(options.orderBy)}`;
      }
      
      if (options.limit) {
        query = sql`${query} LIMIT ${options.limit}`;
      }
      
      if (options.offset) {
        query = sql`${query} OFFSET ${options.offset}`;
      }
      
      return await query;
    } catch (error) {
      console.error(`Erreur lors de la récupération des ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer un enregistrement par ID
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<Object|null>} Enregistrement trouvé ou null
   */
  async findById(id) {
    try {
      const result = await sql`
        SELECT * FROM ${sql(this.tableName)} 
        WHERE id = ${id}
      `;
      return result[0] || null;
    } catch (error) {
      console.error(`Erreur lors de la récupération du ${this.tableName} par ID:`, error);
      throw error;
    }
  }

  /**
   * Créer un nouvel enregistrement
   * @param {Object} data - Données à insérer
   * @returns {Promise<Object>} Enregistrement créé
   */
  async create(data) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      const result = await sql`
        INSERT INTO ${sql(this.tableName)} (${sql(columns)})
        VALUES (${sql(values)})
        RETURNING *
      `;
      
      return result[0];
    } catch (error) {
      console.error(`Erreur lors de la création du ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Mettre à jour un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @param {Object} data - Données à mettre à jour
   * @returns {Promise<Object|null>} Enregistrement mis à jour ou null
   */
  async update(id, data) {
    try {
      const columns = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = columns.map((col, index) => 
        sql`${sql(col)} = ${values[index]}`
      ).reduce((acc, curr) => sql`${acc}, ${curr}`);
      
      const result = await sql`
        UPDATE ${sql(this.tableName)} 
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;
      
      return result[0] || null;
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Supprimer un enregistrement
   * @param {number} id - ID de l'enregistrement
   * @returns {Promise<boolean>} Succès de la suppression
   */
  async delete(id) {
    try {
      const result = await sql`
        DELETE FROM ${sql(this.tableName)} 
        WHERE id = ${id}
        RETURNING id
      `;
      
      return result.length > 0;
    } catch (error) {
      console.error(`Erreur lors de la suppression du ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Compter le nombre d'enregistrements
   * @param {Object} conditions - Conditions de filtrage
   * @returns {Promise<number>} Nombre d'enregistrements
   */
  async count(conditions = {}) {
    try {
      let query = sql`SELECT COUNT(*) as count FROM ${sql(this.tableName)}`;
      
      if (Object.keys(conditions).length > 0) {
        const whereClause = Object.entries(conditions)
          .map(([key, value]) => sql`${sql(key)} = ${value}`)
          .reduce((acc, curr) => sql`${acc} AND ${curr}`);
        
        query = sql`${query} WHERE ${whereClause}`;
      }
      
      const result = await query;
      return parseInt(result[0].count);
    } catch (error) {
      console.error(`Erreur lors du comptage des ${this.tableName}:`, error);
      throw error;
    }
  }

  /**
   * Exécuter une requête personnalisée
   * @param {Function} queryBuilder - Fonction qui construit la requête SQL
   * @returns {Promise<any>} Résultat de la requête
   */
  async executeCustomQuery(queryBuilder) {
    try {
      return await queryBuilder(sql);
    } catch (error) {
      console.error(`Erreur lors de l'exécution de la requête personnalisée sur ${this.tableName}:`, error);
      throw error;
    }
  }
}
